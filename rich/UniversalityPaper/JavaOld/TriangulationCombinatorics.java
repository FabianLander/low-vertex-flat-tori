import java.util.Arrays;


public class TriangulationCombinatorics {

public static int[][] tiling() {
    int[][] t = {
        {3,7,5}, {3,0,7}, {3,5,4}, {3,1,0}, {3,4,2},
        {3,2,1}, {7,1,5}, {7,0,4}, {7,4,6}, {7,6,1},
        {5,6,4}, {5,1,2}, {5,2,6}, {0,2,4}, {0,1,6}, {0,6,2}
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
triangulation.  There are 7 triangulations and each has
24 edges*/

    
public static int[] edgeLink(int link) {
    int[][] l = {
        {1,6,2,4,7,3},
	{2,5,7,6,0,3},
	{3,4,0,6,5,1},
	{1,0,7,5,4,2},
	{0,2,3,5,6,7},
	{1,2,6,4,3,7},
	{0,1,7,4,5,2},
	{1,5,3,0,4,6}};
    return l[link];
}

}
