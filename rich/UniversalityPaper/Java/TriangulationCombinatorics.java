import java.util.Arrays;


public class TriangulationCombinatorics {

public static int[][] tiling() {
    int[][] t = {
        {3,5,6}, {3,2,5}, {3,6,4}, {3,0,2}, {3,4,1},
        {3,1,0}, {5,0,6}, {5,2,4}, {5,4,7}, {5,7,0},
        {6,7,4}, {6,0,1}, {6,1,7}, {2,1,4}, {2,0,7}, {2,7,1}
    };
    return t;
}

public static int lookup(int[] l) {
    int[][] L = tiling();
    for (int i = 0; i < 16; ++i) {
        if (ListHelp.match(l, L[i]) == true) return i;
    }
    return -1;
}

/**This gives the (i)th edge in the (choice)th
triangulation.  There are 5 triangulations and each has
24 edges*/

    
public static int[] edgeLink(int link) {
    int[][] l = {
	{1,6,5,7,2,3},
	{3,4,2,7,6,0},
	{0,7,1,4,5,3},
	{0,2,5,6,4,1},
	{2,1,3,6,7,5},
	{0,6,3,2,4,7},
	{0,1,7,4,3,5},
	{2,0,5,4,6,1}};
    return l[link];
}

}
