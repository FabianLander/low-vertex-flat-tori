import java.awt.event.*;
import java.awt.*;


public class Lever {
    ListenSquare[] L=new ListenSquare[50];
    int[] on=new int[50];
    int val;
    int x,y;
    int count;

    public Lever(int x,int y,int value,int c) {
    this.x=x;
    this.y=y;
    this.val=value;
    this.count=c;
    for(int i=0;i<=count;++i) {
          L[i]=new ListenSquare(x+15*i,y,15,15,null);
          L[i].on=1;
    }
  }

    public void render(Graphics g,Color C,String S) {
	for(int i=0;i<count;++i) {
	    if(i!=val) L[i].render(g,C);
	    if(i==val) L[i].render(g,Color.yellow);
	}  
        g.setFont(new Font("Helvetica",Font.PLAIN,15));
        g.drawString(S,x,y-5);
    }



    public int process(Point X) {
	if(L[count].inside(X)==1) return(99);
	for(int i=0;i<count;++i) {
	    if(L[i].inside(X)==1) {
            val=i;
	    return(i);
	    }
	}
	return(-1);
    }

    public int isUsed(Point X) {
	for(int i=0;i<count;++i) {
	    if(L[i].inside(X)==1) return(i);
	}
	return(-1);
    }


}
